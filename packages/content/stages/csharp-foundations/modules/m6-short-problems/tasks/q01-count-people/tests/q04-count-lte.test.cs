public class Q04CountLteTests
{
    [Theory(DisplayName = "Q04 P 以下")]
    [InlineData("5\n50 60 80 59 100\n60\n", "3\n")]
    [InlineData("1\n60\n60\n", "1\n")]
    public void Q04CountLte(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q04CountLte())));
    }
}
