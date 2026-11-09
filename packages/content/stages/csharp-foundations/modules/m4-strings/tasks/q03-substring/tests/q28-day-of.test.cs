public class Q28DayOfTests
{
    [Fact(DisplayName = "Q28 日")]
    public void Q28DayOf()
    {
        Assert.Equal("03", Answers.Q28DayOf("20260903"));
        Assert.Equal("31", Answers.Q28DayOf("20261231"));
    }
}
