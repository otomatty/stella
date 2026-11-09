public class CbKthPriceTests
{
    [Theory(DisplayName = "到達B 順位の価格")]
    [InlineData("4 2\n5 1 5 3\n", "3\n1\n")]
    [InlineData("4 3\n2 2 2 9\n", "2\n3\n")]
    [InlineData("1 1\n0\n", "0\n1\n")]
    public void CbKthPrice(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CbKthPrice())));
    }
}
