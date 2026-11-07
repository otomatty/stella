public class DbPayTests
{
    [Theory(DisplayName = "到達B 支払額")]
    [InlineData("4 100\n", "400\n")]
    [InlineData("5 100\n", "400\n")]
    [InlineData("0 500\n", "0\n")]
    [InlineData("6 200\n", "1100\n")]
    public void DbPay(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.DbPay())));
    }
}
