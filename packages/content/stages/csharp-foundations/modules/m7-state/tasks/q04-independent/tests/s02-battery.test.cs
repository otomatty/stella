public class S02BatteryTests
{
    [Theory(DisplayName = "S02 電池の範囲")]
    [InlineData("4 5 3\n3\n-8\n2\n", "2\n")]
    [InlineData("0 5 1\n10\n", "5\n")]
    [InlineData("5 5 0\n", "5\n")]
    public void S02Battery(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S02Battery())));
    }
}
