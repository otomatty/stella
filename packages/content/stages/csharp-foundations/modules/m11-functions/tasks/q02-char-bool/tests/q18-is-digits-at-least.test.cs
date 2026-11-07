public class Q18IsDigitsAtLeastTests
{
    [Fact(DisplayName = "Q18 長さと数字")]
    public void Q18IsDigitsAtLeast()
    {
        Assert.Equal(true, Answers.Q18IsDigitsAtLeast("12345", 3));
        Assert.Equal(false, Answers.Q18IsDigitsAtLeast("12", 3));
        Assert.Equal(false, Answers.Q18IsDigitsAtLeast("12a", 3));
    }
}
