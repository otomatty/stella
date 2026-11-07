public class S01TotalPriceTests
{
    [Theory(DisplayName = "S01 価格と個数")]
    [InlineData("80 3\n", "240\n")]
    [InlineData("0 10\n", "0\n")]
    [InlineData("1000 0\n", "0\n")]
    [InlineData("1000 100\n", "100000\n")]
    public void S01TotalPrice(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S01TotalPrice())));
    }
}
