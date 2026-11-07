public class S09BuyTests
{
    [Theory(DisplayName = "S09 購入個数")]
    [InlineData("4 8\n5 2 4 1\n", "3\n")]
    [InlineData("2 8\n9 9\n", "0\n")]
    [InlineData("2 0\n0 0\n", "2\n")]
    public void S09Buy(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S09Buy())));
    }
}
